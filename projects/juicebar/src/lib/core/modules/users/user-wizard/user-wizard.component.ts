import {Component, OnInit} from '@angular/core';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';

@Component({
    selector: 'app-user-wizard',
    templateUrl: './user-wizard.component.html'
})
export class UserWizardComponent implements OnInit {

    constructor(public juicebox: JuiceboxService) {
    }

    ngOnInit(): void {
    }

}
