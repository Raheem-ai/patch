import { AxiosError } from "axios";

export function resolveErrorMessage(e: AxiosError): string {
    if (!e.isAxiosError) {
        console.log('NOT AXIOS ERROR')
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
            return e.response.data.message;

    
        default:
            return JSON.stringify(e?.response?.data || e);
    }
}