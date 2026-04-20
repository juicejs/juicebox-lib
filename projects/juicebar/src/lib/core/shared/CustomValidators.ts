import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {

    /**
     * Password needs to have at least on Upper case letter, one number and 8-12 characters long
     */
    static passwordGeneratorRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{12,16}$/

    static passwordValidatorRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,64}$/

    /**
     * Wallet address is valid if empty (because it is an optional field) or with length of 34
     * @param control
     */
    static addressLength(control: AbstractControl): ValidationErrors | null {
        return !control.value || control.value.length === 34 ? null : { 'addressLength': true }
    }

    static emptyString(control: AbstractControl): ValidationErrors | null {
        return !!control.value.trim() ? null : { 'empty': true };
    }

    static getStringFromLocalizedObject(localizedObject: any, language: string, defaultSystemLanguage: string): string | void {
        if (typeof localizedObject != 'object') {
            return localizedObject;
        }

        if (language in localizedObject) {
            return localizedObject[language];
        } else if (localizedObject[defaultSystemLanguage]) {
            return localizedObject[defaultSystemLanguage];
        } else if (Object.keys(localizedObject).length) {
            return localizedObject[Object.keys(localizedObject)[0]];
        }
    }

    /**
     * Validate password
     * @param control
     */
    static password(control: AbstractControl): ValidationErrors | null {
        const regex = CustomValidators.passwordValidatorRegex;
        return (typeof control.value === "string" && regex.test(control.value)) ? null : { 'password': true };
    }

    /**
     * PasswordMatch is valid if control values for "password" and "repeatPassword" match
     * @param formGroup
     */
    static passwordMatch(formGroup: FormGroup) {
        return formGroup.get('password').value === formGroup.get('repeatPassword').value ? null : { 'mismatch': true };
    };

    /**
     * Form is valid if the formGroup has a value in at least one of provided control keys
     * @param keys
     */
    static oneOf(...keys: Array<string>): ValidatorFn {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            for (let key of keys) {
                if (!!control.value[key]) return null;
            }
            return { 'oneOf': true }
        };
    }

    /**
     * Form is valid if control value does not exist in array
     * @param array
     */

    static keyExistsInArray(array: Array<any>): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            for (let i = 0; i < array.length; i++) {
                if (control.value === array[i].key) return { 'keyExistsInArray': true }
            }
            return null
        }
    }

    /**
     * startsWith is valid if the control value starts with the given characters
     * @param startsWithValue
     */
    static startsWith(startsWithValue: string) {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control || !control.value || !control.value.startsWith("#")) {
                return { 'startsWith': true }
            }
            return null;
        }
    }
    /*
    * checks if string value is valid slug. Can't have space, /, umlauts and any ASCII characters,
    * must be all lowercase
    * @parm control
    * */
    static slug(control: AbstractControl): ValidationErrors | null {
        const isValid = new RegExp('^[a-z0-9_-]*$').test(control.value?.replaceAll(' ', '-'));
        return isValid
            ? null
            : { slug: false };
    }
}
