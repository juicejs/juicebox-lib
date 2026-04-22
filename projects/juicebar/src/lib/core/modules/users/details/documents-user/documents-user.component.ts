import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-documents-user',
  templateUrl: './documents-user.component.html',
  styleUrls: ['./documents-user.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class DocumentsUserComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
