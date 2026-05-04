import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';

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
  pageIndexInput = input<number>(0, { alias: 'pageIndex' });

  pageIndex = signal(this.pageIndexInput());

  page = output<PageEvent>();

  protected readonly Math = Math;

  constructor() {
    effect(() => {
      this.pageIndex.set(this.pageIndexInput());
    });
  }

  get totalPages(): number {
    return Math.ceil(this.length() / this.pageSize());
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
