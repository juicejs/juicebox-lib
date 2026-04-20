export type ActionButton = {
  title: string,
  icon?: string,
  type: string,
  permissionsHide?: string,
  permissions?: string,
  disabled?: boolean,
  routerLink?: string,
  callback?: () => any
  callAction?: () => any;
  promise?: any
}
