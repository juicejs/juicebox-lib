import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'app-filter-container',
    templateUrl: './filter-container.component.html',
    styleUrls: ['./filter-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterContainerComponent {
    readonly label = input<string>();
    readonly labelWidth = input<string>();
}
