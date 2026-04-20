export class User {

    _id?: string;

    firstname: string;
    lastname: string;

    nickname: string;
    email: string;
    password: string;
    attributes: any;
    roles: [{
        role: string,
        permissions: any
    }];

    groups?: {
        [organisation_id: string]: Array<string>
    };

    wallets: Array<{
        address: string
        privateKey: string
        publicKey: string
    }>;
}
