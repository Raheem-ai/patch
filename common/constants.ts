import STRINGS from "./strings";

export const SessionCookieName = 'raheem.sid';

export const RequestPrefixCharMax = 6;

export const PhoneNumberRegex = /^\+[1-9]\d{1,14}$/;

export const minPasswordLength = 2;
export const isPasswordValid = (password: string) => {
    if(password.length < minPasswordLength) {
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.passwordTooShort
        };
    } else {
        return {
            isValid: true,
            msg: null
        }; 
    }
}

export const isEmailValid = (email: string) => { 
    const atSymbol = email.indexOf("@");
    const domain = email.slice(atSymbol + 1);
    const dot = domain.indexOf(".");
    
    if (atSymbol < 1) { // there's no email address
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.emailProbablyNotRight
        };
    } else if (dot < 2) { // the domain name is less than 2 characters
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.emailProbablyNotRight
        }
    } else if (dot === domain.length -1) { // there's no TLD
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.emailProbablyNotRight
        }
    } else {
        return {
            isValid: true,
            msg: `everything's fine`
        }; 
    }
}