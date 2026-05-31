import { Component, ChangeDetectionStrategy, input, output, model, computed } from '@angular/core';

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
  length: number;
}

@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  length = input<number>(0);
  pageSize = input<number>(10);
  pageSizeOptions = input<number[]>([5, 10, 25, 50]);
  pageIndex = model<number>(0);

  page = output<PageEvent>();

  protected readonly Math = Math;

  get totalPages(): number {
    return Math.ceil(this.length() / this.pageSize());
  }

  protected readonly pages = computed<(number | '…')[]>(() => {
    const total = Math.ceil(this.length() / this.pageSize());
    const current = this.pageIndex() + 1;
    const result: (number | '…')[] = [];
    const win = 2;

    result.push(1);
    if (current - win > 2) result.push('…');
    for (let p = Math.max(2, current - win); p <= Math.min(total - 1, current + win); p++) {
      result.push(p);
    }
    if (current + win < total - 1) result.push('…');
    if (total > 1) result.push(total);

    return result;
  });

  goToPage(p: number | '…') {
    if (p === '…') return;
    const idx = (p as number) - 1;
    if (idx === this.pageIndex()) return;
    this.pageIndex.set(idx);
    this.emitPageEvent();
  }

  previousPage() {
    if (this.pageIndex() > 0) {
      this.pageIndex.update(i => i - 1);
      this.emitPageEvent();
    }
  }

  nextPage() {
    if (this.pageIndex() < this.totalPages - 1) {
      this.pageIndex.update(i => i + 1);
      this.emitPageEvent();
    }
  }

  private emitPageEvent() {
    this.page.emit({
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      length: this.length()
    });
  }
}
