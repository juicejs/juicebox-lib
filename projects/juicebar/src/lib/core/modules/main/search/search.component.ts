import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { JuiceboxService } from '../../../shared/services/Juicebox.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {

  public juicebox = inject(JuiceboxService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    this.route.queryParamMap.pipe(
      map(params => params.get('q')?.trim() ?? ''),
      debounceTime(500),
      distinctUntilChanged(),
      // switchMap cancels the previous search: when a newer token arrives, the
      // result of the superseded (still-pending) doSearch promise is ignored.
      switchMap(token => token ? from(this.juicebox.doSearch(token)) : of([])),
      takeUntilDestroyed(),
    ).subscribe(groups => this.juicebox.searchResults.set(groups));
  }

  protected async openResult(result: { link: string }) {
    await this.router.navigateByUrl(result.link);
  }
}
