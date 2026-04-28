// Re-export CDK Table components and directives with app- prefix
export {
  CdkTable as AppTable,
  CdkHeaderRow as AppHeaderRow,
  CdkRow as AppRow,
  CdkHeaderRowDef as AppHeaderRowDef,
  CdkRowDef as AppRowDef,
  CdkHeaderCell as AppHeaderCell,
  CdkCell as AppCell,
  CdkColumnDef as AppColumnDef,
  CdkHeaderCellDef as AppHeaderCellDef,
  CdkCellDef as AppCellDef
} from '@angular/cdk/table';

export { CdkTableModule } from '@angular/cdk/table';
