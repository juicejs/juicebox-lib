import {Component, EventEmitter, input, OnInit, output, ChangeDetectionStrategy} from "@angular/core";
import {FormBuilder, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {CommonModule} from '@angular/common';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

@Component({
    selector: 'page-size-selector',
    templateUrl: './page-size-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonToggleModule
    ]
})
export class PageSizeSelectorComponent implements OnInit {
    public radioGroupForm: FormGroup

    public _sizes: Array<number>  =   [10,20,50];
    public pageSize = 10;

    sizes = input<number[]>();

    ngOnChanges() {
        if(this.sizes()) {
            this._sizes = this.sizes();
        }
    }

    defaultSize = input<number>();

    ngOnInit2() {
        if(this.defaultSize()) {
            this.pageSize = this.defaultSize();
        }
    }

    onChange = output<number>()

    constructor(private formBuilder: FormBuilder) {}

    ngOnInit(): void {
        this.radioGroupForm = this.formBuilder.group({
            'pageSize': this.pageSize || this._sizes[0]
        });
    }

    public selected(size?){
        this.onChange.emit(size)
    }

}