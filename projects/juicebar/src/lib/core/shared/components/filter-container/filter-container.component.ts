import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'app-filter-container',
    templateUrl: './filter-container.component.html',
    styleUrls: ['./filter-container.component.scss']
})
export class FilterContainerComponent implements OnInit {

    @Input() label: string;
    @Input() labelWidth: string;

    constructor() {
    }

    ngOnInit() {
    }

}
