import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { MongoClient, ObjectId } from 'mongodb';
import { stringify } from 'csv-stringify';
import { mkdir, writeFile } from "fs/promises";
import { JSONObject } from 'proto3-json-serializer';
import { RequestType, RequestStatus, 
    RequestPriority, RequestTypeCategory, 
    Delimiters, RequestTypeToLabelMap, 
    Handle, CategoryId, ExportList, MAILGUN_CREDS} from './export_models';
import path from 'path';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { readFile } from 'fs-extra';

const mailgun = new Mailgun(formData);
const mailClient = mailgun.client({username: 'api', key: MAILGUN_CREDS.api_key});

const Handlebars = require("handlebars");


function replaceCharAt(str: string,index: number,chr: string) {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}

async function run(){

    const args = process.argv;
    // const orgId = "62ec169b6fadb2996a54eded";
    const orgId = args[2];
    const userEmail = args[3]; 
    const secretClient = new SecretManagerServiceClient();

    type MONGO_DB_CREDS = {
        username: string,
        password: string 
    }

    const SECRET_ID = ""; // the secret path from google secret manager goes here
    const [response] = await secretClient.accessSecretVersion({ name: SECRET_ID });
    const responsePayload = response!.payload!.data!.toString(); 

    const secret = JSON.parse(responsePayload);

    const uri = `mongodb+srv://${secret.DB_USER}:${secret.DB_PW}@cluster0.zlpbo.mongodb.net/test?retryWrites=true&w=majority`;

    const dbClient = new MongoClient(uri);

    let orgName = ''; 
    
    try{

        const orgRequests = await dbClient
        .db("patch")
        .collection("help_requests")
        .find({"orgId": orgId})
        .project({displayId: 1, 
                  location: 1, 
                  createdAt: 1, 
                  callStartedAt: 1, 
                  callEndedAt: 1, 
                  statusEvents: 1, 
                  priority: 1, 
                  type: 1, 
                  tagHandles: 1})
        .toArray();

        const orgObject = await dbClient
        .db("patch")
        .collection("organizations")
        .find({"_id": new ObjectId(orgId)}).toArray();

        console.log(orgObject);

        const parsedOrgReqs = JSON.parse(JSON.stringify(orgRequests));
        const parsedOrgObj = JSON.parse(JSON.stringify(orgObject[0]));

        await exportStats(parsedOrgObj, parsedOrgReqs, './');

        orgName = parsedOrgObj.name; 

    } catch(err){

        console.log(err);
        await dbClient.close();

    } finally {
        await dbClient.close();
        await sendOrgDataEmail(userEmail, orgName);
    }
}

async function exportStats(org: any, requests: any, basePath: string) {
    const headers = [
        'Request ID',
        'Crisis Types',
        'Tags',
        'Address',
        'Latitude',
        'Longitude',
        'Request Created At',
        '1st "On The Way" Status',
        '1st "On Site" Status',
        '1st "Finished" Status',
        '1st "Archived" Status',
        'Priority'
    ];

    const rows = requests.map((req: ExportList) => {
        return [
            req.displayId,
            req.type.map(( t: RequestType) => RequestTypeToLabelMap[t]).join(),
            req.tagHandles.map((handle: Handle) => {
                const cat = org.tagCategories.find((c: CategoryId) => c.id == handle.categoryId)
                const tag = cat.tags.find((t: CategoryId) => t.id == handle.itemId)

                return `${cat.name}::${tag.name}`
            }).sort().join(),
            req.location?.address || '',
            req.location?.latitude,
            req.location?.longitude,
            req.createdAt,
            req.statusEvents.find((e: { status: RequestStatus; }) => e.status == RequestStatus.OnTheWay)?.setAt || '',
            req.statusEvents.find((e: { status: RequestStatus; }) => e.status == RequestStatus.OnSite)?.setAt || '',
            req.statusEvents.find((e: { status: RequestStatus; }) => e.status == RequestStatus.Done)?.setAt || '',
            req.statusEvents.find((e: { status: RequestStatus; }) => e.status == RequestStatus.Closed)?.setAt || '',
            req.priority ? RequestPriority[req.priority] : ''
        ]
    })

    const requestStatsPath = `${basePath}/patch_help_request_data.csv`

    let csvData = await new Promise<string>((res, rej) => {
        stringify([
            headers,
            ...rows
        ], (err, output) => {
            if (err) {
                rej(err)
            } else {
                res(output)
            }
        })
    })

    csvData = replaceTagCommas(csvData); 

    await writeFile(requestStatsPath, csvData);

}

function replaceTagCommas(csvData: string){

    let tagMode = false;
    let quoteMode = false; 

    for (let i = 1; i < csvData.length - 1; i++){

        if(csvData[i] == '"'){
            if (quoteMode) {
                quoteMode = false;
                tagMode = false;
            } else {
                quoteMode = true; 
            }
        } else if(csvData[i] + csvData[i+1] == '::' && quoteMode){
            if(!tagMode){
                tagMode = true;
            }
        } else if (csvData[i] == ',' && tagMode && quoteMode){
            csvData = replaceCharAt(csvData, i, '%%');
        }
    }
    
    return csvData; 
}

async function sendEmail(recipientEmail: string, subject: string, emailTemplate: string) 
{ 
    const filepath = path.resolve('request_data.csv');
    const file = {
        filename: 'request_data.csv',
        data: await readFile(filepath)
      };
    const raheemMailOptions = {
        from: 'Patch <help@getpatch.org>', // config.EMAIL.get().patch_system,
        to: recipientEmail,
        subject: subject,
        html: emailTemplate,
        attachment: file
    }

    await mailClient.messages.create(MAILGUN_CREDS.domain, raheemMailOptions)
}

async function sendOrgDataEmail(recipientEmail: string, orgName: string)
{
    const subject = "Your Organization's Data in Patch";
    const filepath = path.resolve(__dirname, './passwordReset.html');
    const data: string = await readFile(filepath, 'utf-8');
    const passwordResetEmail: string = '' + data;
    const template = Handlebars.compile(passwordResetEmail);
    const emailBody = template({ "email": recipientEmail, "orgName": orgName});

    await sendEmail(recipientEmail, subject, emailBody);
}


run();