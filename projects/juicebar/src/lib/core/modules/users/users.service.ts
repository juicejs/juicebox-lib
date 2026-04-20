import {Result} from '../../shared/types/Result';
import {Injectable} from '@angular/core';
import {Juice} from '../../shared/services/juice.service';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {ActionButton} from '../../shared/types/ActionButton';
import { ISort} from '../../shared/interfaces/ISort';
import { ISearchTerm} from '../../shared/interfaces/ISearchTerm';

@Injectable({providedIn: 'root'})
export class UsersService {

    constructor(private juice: Juice, private juicebox: JuiceboxService) {}

    public customActionButtons: Array<any> = [];

    public addCustomActionButton(actionButton: ActionButton){
        this.customActionButtons.push(actionButton);
    }

    // ************************** CODE CONNECTED TO USERS ************************** //

    createUser(data: any): Promise<any> {
        return this.juice.request(
            'users',
            'createUser',
            [data]
        );
    }

    updateUser(usersId, data: any): Promise<any> {
        return this.juice.request(
            'users',
            'updateUser',
            [usersId, data]
        );
    }

    deleteUser(userId: string) {
        return this.juice.request(
            'users',
            'deleteUser',
            [userId]
        );
    }

    resetTwoFactor(user_id: string): Promise<Result> {
        return this.juice.request(
            'users',
            'resetTwoFactor',
            [user_id]
        );
    }

    getUser(userId: string): Promise<any> {
        return this.juice.request(
            'users',
            'getUser',
            [userId]
        );
    }

    /**
     * Returns users
     *
     * @param organisationId
     * @param page - page number
     * @param pageSize
     * @param sort
     * @param filter
     * @returns {Promise<any>}
     */
    fetch(organisationId: string, page: number, pageSize: number, sort: ISort, filter: Array<ISearchTerm>): Promise<any> {
        return this.juice.request(
            'users',
            'fetch',
            [organisationId, page, pageSize, sort, filter]
        );
    }

    /**
     * Search users
     * @param query
     * @param page
     * @param pageSize
     */
    search(query: Array<{ property: string, fullText: boolean, language: boolean, term: string }>, page, pageSize): Promise<any> {
        return this.juice.request(
            'users',
            'search',
            [page, pageSize, query]
        );
    }

    /**
     * Update users password
     * Including currentPassword will check if the current password matches before setting the new password
     *
     * @param {string} id
     * @param {string} password
     * @param currentPassword
     *
     * @returns {Promise<any>}
     */
    updatePassword(id: string, password: string, currentPassword?: string) {
        return this.juice.request(
            'users',
            'updatePassword',
            [id, password, currentPassword]
        );
    }

    updateRoles(userId: string, roles: any, organisationId: string): Promise<any> {
        return this.juice.request(
            'users',
            'updateRoles',
            [userId, organisationId, roles]
        );
    }

    addRole(userId: string, role: string, organisationId: string): Promise<Result> {
        return this.juice.request(
            'users',
            'addRole',
            [userId, role, organisationId]
        )
    }

    removeRole(userId: string, role: string, organisationId: string): Promise<Result> {
        return this.juice.request(
            'users',
            'removeRole',
            [userId, role, organisationId]
        )
    }

    updatePermissions(userId: string, role: string, permissions: { [key: string]: boolean }, organisationId: string): Promise<Result> {
        return this.juice.request(
            'users',
            'updateRolePermissions',
            [userId, role, permissions, organisationId]
        )
    }

    updateChannelAccessPermissions(userId, data: any): Promise<Result> {
        return this.juice.request(
            'users',
            'updateChannelAccessPermissions',
            [userId, data]
        )
    }


    // ************************** CODE CONNECTED TO GROUPS ************************** //

    getAllGroups(): Promise<any> {
        return this.juice.request(
            'users:groups',
            'getAllGroups',
            []
        );
    }

    getUserGroups(user_id: string): Promise<any> {
        return this.juice.request(
            'users:groups',
            'getUserGroups',
            [user_id]
        );
    }

    getGroupById(id: string): Promise<any> {
        return this.juice.request(
            'users:groups',
            'getGroupById',
            [id]
        );
    }

    createGroup(data: any): Promise<any> {
        return this.juice.request(
            'users:groups',
            'createGroup',
            [data]
        );
    }

    updateGroup(data: any): Promise<any> {
        return this.juice.request(
            'users:groups',
            'updateGroup',
            [data]
        );
    }

    updateGroupRolePermissions(groupId: string, role: any) {
        return this.juice.request(
            'users:groups',
            'updateGroupRolePermissions',
            [groupId, role]
        );
    }

    deleteGroupRole(groupId: string, role: any) {
        return this.juice.request(
            'users:groups',
            'deleteGroupRole',
            [groupId, role]
        );
    }

    addRoleToGroup(groupId: string, role: string) {
        return this.juice.request(
            'users:groups',
            'addRoleToGroup',
            [groupId, role]
        );
    }

    addGroupToUser(key: string, user_id: string, organisation_id: string): Promise<any> {
        return this.juice.request(
            'users:groups',
            'addGroupToUser',
            [user_id, organisation_id, key]
        );
    }

    deleteGroupFromUser(key: string, user_id: string, organisation_id: string): Promise<any> {
        return this.juice.request(
            'users:groups',
            'deleteGroupFromUser',
            [user_id, organisation_id, key]
        );
    }

    // ************************** CODE CONNECTED TO WALLET ************************** //
    /**
     * Creates new wallet
     * @param id
     * @param data
     */
    createWallet(id, data): Promise<any> {
        return this.juice.request(
            'juicechain:wallets',
            'createUserWallet',
            [id, data]
        );
    }

// ************************** CODE CONNECTED TO QC ************************** //

    /**
     * Create new user from an existing Trainee
     *
     * @param data
     * @returns {Promise<any>}
     */
    createUserFromTrainee(data: any): Promise<any> {
        return this.juice.request(
            'users',
            'createUserFromTrainee',
            [data]
        );
    }

    // ************************** CODE CONNECTED TO FORGOT PASSWORD FUNCTIONALITY ************************** //
    forgotPassword(email: string, redirectUrl?: string): Promise<Result> {
        return this.juicebox.forgotPassword(
            'users',
            'forgotPassword',
            [email, redirectUrl]
        );
    }

    isForgotPasswordTokenValid(token: string): Promise<Result> {
        return this.juicebox.forgotPassword(
            'users',
            'isForgotPasswordTokenValid',
            [token]
        );
    }

    resetPassword(password: string, repeatPassword: string, token: string): Promise<Result> {
        return this.juicebox.forgotPassword(
            'users',
            'resetPassword',
            [password, repeatPassword, token]
        );
    }

    //***************************Code for vendor in Visitor Web project *********************************//

    createVendor(data) : Promise<any> {
        return  this.juice.request(
            "juicecommerce:userseller:visitorapp",
            "createVendor",
            [data]
        );
    }

}
