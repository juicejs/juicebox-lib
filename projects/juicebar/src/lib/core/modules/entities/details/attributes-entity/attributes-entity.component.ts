import {Component, inject, OnInit, viewChild} from '@angular/core';
import {DialogService} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {AddAttributeDialogComponent} from './add-attribute/add-attribute-dialog.component';
import {AttributeListComponent} from './attribute-list/attribute-list.component';
import {DeleteAttributeDialogComponent} from './delete-attribute/delete-attribute-dialog.component';

/**
 * The Attributes tab: the customer's attribute values, and for admins of customers "Add attribute" and "Delete
 * attribute", which change the fields of a customer type. The fields are read again when either dialog closes.
 */
@Component({
  selector: 'app-attributes-entity',
  template: '<app-entity-attribute-list />',
  imports: [AttributeListComponent],
  providers: [EntitiesTranslationPipe],
})
export class AttributesEntityComponent implements OnInit {
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly list = viewChild.required(AttributeListComponent);

  ngOnInit(): void {
    this.juicebox.setActionButtons([
      {
        title: this.i18n.transform('add_attribute'),
        icon: 'add_circle',
        type: 'btn-primary',
        permissionsHide: 'entities:role#admin',
        callback: () => this.open(this.dialog.open<AddAttributeDialogComponent, undefined, boolean>(AddAttributeDialogComponent, {disableClose: true})),
      },
      {
        title: this.i18n.transform('delete_attribute'),
        icon: 'remove_circle',
        type: 'btn-secondary',
        permissionsHide: 'entities:role#admin',
        callback: () => this.open(this.dialog.open<DeleteAttributeDialogComponent, string | null, boolean>(
          DeleteAttributeDialogComponent, {disableClose: true, data: this.list().entityType()},
        )),
      },
    ]);
  }

  private open(dialogRef: {closed: {subscribe(next: () => void): unknown}}): void {
    dialogRef.closed.subscribe(() => void this.list().reload());
  }
}
