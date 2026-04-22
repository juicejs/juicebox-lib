import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet]
})
export class UsersComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
