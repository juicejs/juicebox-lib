import {NgModule} from '@angular/core';
import {IJuiceboxExtensions} from '../../models/searchprovider.interface';
import {JuiceboxService} from '../../services/Juicebox.service';
import {UsersService} from "./users.service";
import {ISort} from "../../interfaces/ISort";
import {ISearchTerm} from "../../interfaces/ISearchTerm";

@NgModule({
    imports: [],
    exports: []
})
export class UsersExtensionsModule implements IJuiceboxExtensions{
    loggedInOrganisationId: string;
    sort: ISort = { dir: 'asc', prop: 'lastname' };
    filter: Array<ISearchTerm> = [];

    constructor(private juicebox: JuiceboxService,
                public usersService: UsersService) {
        juicebox.registerSearchProvider(this, "Users", "fa-users", "users:role");
    }

    async search(token: string): Promise<Array<{ title: string; details: string; link: string }>> {
        this.loggedInOrganisationId = this.juicebox.getUser().organisation_id;
        const results = await this.usersService.fetch(this.loggedInOrganisationId, 0, 10, this.sort, [
            {
                "property": "email",
                "term": token,
                "fullText": true,
                "language": false,
                "languages": null
            }
        ]);

        if (!results || !results.success)
            return;

        return results.payload.items.map(result => {
            return {
                title: result.firstname + " " + result.lastname,
                details: result.email,
                link: "main/users/details/"+result._id+"/details-user"
            }
        });
    }

}