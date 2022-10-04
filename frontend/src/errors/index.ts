import { AxiosError } from "axios";

export function resolveErrorMessage(e: AxiosError): string {
    if (!e.isAxiosError) {
        console.log('NOT AXIOS ERROR:', e.message)
        return e.message
    }

    const type = e?.response?.data?.name;

    switch (type) {
        case 'REQUIRED_VALIDATION_ERROR':
            const missingFields = e.response.data.errors.map(err => `'${err.params?.missingProperty}'`);    
            return `Missing required field${missingFields.length > 1 ? 's' : ''} ${missingFields.join(', ')}`
        case 'AJV_VALIDATION_ERROR':
            const field = e.response.data.message.split('"')[1].split('.').pop();
            return `Field '${field}' has invalid format`;
        case 'BAD_REQUEST': 
        case 'UNAUTHORIZED':
            return e.response.data.message;
        case 'FORBIDDEN':
            return e.response.data.message;
    
        default:
            return `Something went wrong. Make sure you're online and, if it persists, email help@getpatch.org. \n\n ${JSON.stringify(e?.response?.data || e)}`;
    }
}