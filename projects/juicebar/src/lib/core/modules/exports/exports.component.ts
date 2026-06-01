import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
    selector: 'app-exports',
    templateUrl: './exports.component.html',
    styleUrls: ['./exports.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet]
})
export class ExportsComponent {
}
