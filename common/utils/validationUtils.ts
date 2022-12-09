import { minPasswordLength } from "../constants";
import STRINGS from "../strings";

export const isPasswordValid = (password: string) => {
    if(password.length < minPasswordLength) {
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.errorMessages.passwordTooShort
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
    
    if (atSymbol < 1) { // there's no addressee (e.g. `foo.org` or `charlie.foo.org`) 
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.emailProbablyNotRight
        };
    } else if (dot < 1 || dot === domain.length - 1) { // there's no domain name (e.g. `charlie@` or `charlie@foo.` or `charlie.lipford@foo`)
        return {
            isValid: false, 
            msg: STRINGS.ACCOUNT.emailProbablyNotRight
        }
    } else {
        return {
            isValid: true,
        }; 
    }
}