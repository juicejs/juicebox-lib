import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {FormBuilder, FormGroup} from "@angular/forms";

@Component({
    selector: 'page-size-selector',
    templateUrl: './page-size-selector.component.html'
})
export class PageSizeSelectorComponent implements OnInit {
    public radioGroupForm: FormGroup

    public _sizes: Array<number>  =   [10,20,50];
    public pageSize = 10;

    @Input('sizes')
    public set sizes(sizes){
        if(!sizes) return;
        this._sizes = sizes;
    }



    @Input('defaultSize')
    public set defaultSize(size){
        if(!size) return;
        this.pageSize = size;
    }

    @Output('pageSizeChanged')
    onChange: EventEmitter<number> = new EventEmitter<number>()

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