import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { JuiceboxService } from '../../services/Juicebox.service';
import { TableActions } from './table-data';
export enum MaterialSelectionType {
  single = 'single',
  multiple = 'multiple',
  none = 'none',
}

@Component({
  selector: 'app-ng-table',
  styleUrls: ['./listing.component.scss'],
  templateUrl: './listing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingComponent implements OnInit {
  protected juicebox = inject(JuiceboxService);

  @Output()
  cellClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output()
  actionsclicked: EventEmitter<any> = new EventEmitter();

  public showFilterRow: Boolean = false;

  // @Input()
  // public set config(conf: any) {
  //     if (!conf.className) {
  //         conf.className = 'table-striped table-bordered';
  //     }
  //     if (conf.className instanceof Array) {
  //         conf.className = conf.className.join(' ');
  //     }
  //     this._config = conf;
  // }

  // @Input()
  // public set columns(values: Array<any>) {
  //     let newColumns: Array<any> = [];
  //     values.forEach((value: any) => {
  //         if (value.filtering) {
  //             this.showFilterRow = true;
  //         }
  //         if (value.className && value.className instanceof Array) {
  //             value.className = value.className.join(' ');
  //         }
  //         let column = this._columns.find((col: any) => col.name === value.name);
  //         if (column) {
  //             Object.assign(column, value);
  //         }
  //         newColumns.push(value);
  //     });
  //     this._columns = newColumns;
  // }

  public rows: Array<any> = [];
  public columns: Array<any> = [];
  public actions: Array<any> = TableActions;
  public name: Array<any> = [];
  public id: Array<any> = [];

  public page: number = 1;
  public itemsPerPage: number = 10;
  public maxSize: number = 10;
  public numPages: number = 1;
  public length: number = 0;

  public config: any = {
    paging: true,
    filtering: { filterString: '' },
    columnName: 'email',
    sorting: { columns: this.columns },
    className: [],
    columnActions: { title: 'Actions' },
  };

  private data: Array<any> = [];

  public SelectionType: typeof MaterialSelectionType = MaterialSelectionType;

  public constructor() {
    this.length = this.data.length;

    const self = this;
    // NgTableComponent.prototype.getData = function (row, propertyName: any | string) {
    //     if (propertyName instanceof Function) {
    //         return propertyName(row);
    //     } else {
    //         // check if language encoding required
    //         if (propertyName.indexOf("(language)") > 0){
    //             const lang = self.juicebox.getLanguage();
    //             propertyName = propertyName.replace("(language)", "." + lang);
    //         }
    //
    //         // read property
    //         try{
    //             return propertyName.split('.').reduce(function (prev, curr) { return prev[curr]; }, row);
    //         } catch (exception){
    //             return "N.A";
    //         }
    //     }
    // };
  }

  public filters = {};
  //public sort = {};

  public ngOnInit(): void {
    this.onChangeTable(this.config);
  }

  public changePage(page: any, data: Array<any> = this.data): any {
    let start = (page.page - 1) * page.itemsPerPage;
    let end = page.itemsPerPage > -1 ? start + page.itemsPerPage : data.length;
    return data.slice(start, end);
  }

  public changeSort(data: any, config: any): any {
    if (!config.sorting) {
      return data;
    }

    let columns = this.config.sorting.columns || [];
    let columnName: string = void 0;
    let sort: string = void 0;

    for (let i = 0; i < columns.length; i++) {
      if (columns[i].sort !== '' && columns[i].sort !== false) {
        columnName = columns[i].name;
        sort = columns[i].sort;
      }
    }

    if (!columnName) {
      return data;
    }

    // simple sorting
    return data.sort((previous: any, current: any) => {
      if (previous[columnName] > current[columnName]) {
        return sort === 'desc' ? -1 : 1;
      } else if (previous[columnName] < current[columnName]) {
        return sort === 'asc' ? -1 : 1;
      }
      return 0;
    });
  }

  public changeFilter(data: any, config: any): any {
    let filteredData: Array<any> = data;
    this.columns.forEach((column: any) => {
      if (column.filtering) {
        filteredData = filteredData.filter((item: any) => {
          return item[column.name].match(column.filtering.filterString);
        });
      }
    });

    if (!config.filtering) {
      return filteredData;
    }

    if (config.filtering.columnName) {
      return filteredData.filter((item: any) =>
        item[config.filtering.columnName].match(
          this.config.filtering.filterString,
        ),
      );
    }

    let tempArray: Array<any> = [];
    filteredData.forEach((item: any) => {
      let flag = false;
      this.columns.forEach((column: any) => {
        if (
          item[column.name].toString().match(this.config.filtering.filterString)
        ) {
          flag = true;
        }
      });
      if (flag) {
        tempArray.push(item);
      }
    });
    filteredData = tempArray;

    return filteredData;
  }

  public onChangeTable(
    config: any,
    page: any = { page: this.page, itemsPerPage: this.itemsPerPage },
  ): any {
    if (config.filtering) {
      Object.assign(this.config.filtering, config.filtering);
    }

    if (config.sorting) {
      Object.assign(this.config.sorting, config.sorting);
    }

    let filteredData = this.changeFilter(this.data, this.config);
    let sortedData = this.changeSort(filteredData, this.config);
    this.rows =
      page && config.paging ? this.changePage(page, sortedData) : sortedData;
    this.length = sortedData.length;
  }

  public getData(row: any, propertyName: string): string {
    return propertyName
      .split('.')
      .reduce((prev: any, curr: string) => prev[curr], row);
  }

  public onCellClick(data: any): any {
    this.name = data.row.name;
    this.id = data.row._id;
    this.cellClicked.emit(this.name);
  }

  public clickActions(row: any, action: any): void {
    this.actionsclicked.emit({ row, action });
  }
  public enableColumnAction(addColumnAction: boolean, actions: any): boolean {
    return addColumnAction && actions;
  }
}
