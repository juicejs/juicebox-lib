import {Component, input, OnInit, output, ChangeDetectionStrategy, signal} from "@angular/core";
import {CommonModule} from '@angular/common';
import {ButtonComponent} from '../../../../ui-components';

@Component({
    selector: 'page-size-selector',
    templateUrl: './page-size-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ButtonComponent
    ]
})
export class PageSizeSelectorComponent implements OnInit {

    sizes = input<number[]>();
    defaultSize = input<number>();

    onChange = output<number>();

    _sizes = signal<number[]>([10, 20, 50]);
    pageSize = signal<number>(10);

    ngOnInit(): void {
        const s = this.sizes();
        if (s && s.length) this._sizes.set(s);

        const d = this.defaultSize();
        if (d) this.pageSize.set(d);
        else this.pageSize.set(this._sizes()[0]);
    }

    select(size: number) {
        this.pageSize.set(size);
        this.onChange.emit(size);
    }
}
