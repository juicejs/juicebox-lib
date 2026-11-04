import {Component, input, OnInit, output, ChangeDetectionStrategy, signal} from "@angular/core";
import {ButtonComponent} from '../../../../ui-components';

@Component({
    selector: 'page-size-selector',
    templateUrl: './page-size-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ButtonComponent
]
})
export class PageSizeSelectorComponent implements OnInit {

    sizes = input<number[]>();
    defaultSize = input<number>();

    /** The old juicebox name of the event, which the ported project templates bind to */
    pageSizeChanged = output<number>();
    /** Same event, for apps already written against the lib */
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
        this.pageSizeChanged.emit(size);
        this.onChange.emit(size);
    }
}
