import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';

@Component({
    selector: 'auto-language',
    templateUrl: './auto-language.component.html',
    styleUrls: ['./auto-language.component.css']
})
export class AutoLanguageComponent implements OnChanges {

    @Input("value") public value: any;
    @Input("language") public language: any;
    @Input("strikethrough") public strikethrough: boolean;

    public fallback: string;
    public clearText: string;

    constructor(private juicebox: JuiceboxService) {}

    ngOnChanges() {
        if (!this.value) return;
        if (this.strikethrough == undefined) this.strikethrough = true;

        if (!this.language){
            this.language = this.juicebox.getLanguage();
        }
        if (this.value[this.language]){
            this.clearText = this.value[this.language];
            this.fallback = this.language.split("_")[0].toUpperCase();
        } else {
            if (typeof this.value == "string")
                this.clearText = this.value;
            else if (typeof this.value == "number") {
                this.clearText = this.value.toString();
            } else {
                let key = Object.keys(this.value)[0];
                if(!key){
                    this.fallback = null;
                    this.clearText = 'Missing name translation';
                } else {
                    this.fallback = key.split("_")[0].toUpperCase();
                    this.clearText = this.value[key];
                }

            }
        }
    }

}
