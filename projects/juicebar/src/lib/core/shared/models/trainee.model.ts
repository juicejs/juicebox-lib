export class Trainee {
    _id: string;
    salutation: string = '';
    sex: string = '';
    firstname: string = '';
    lastname: string = '';
    name: string = '';
    phone: string = '';
    email: string = '';
    job: string = '';
    type: string = 'trainee';
    attributes: {birthdate: any};
    wallets: Array<any> = undefined;
    addresses: Array<any> = [{
        city: '',
        street: '',
        country: '',
        postcode: ''
    }];
    external_id: '';
    trainer: boolean;
}
