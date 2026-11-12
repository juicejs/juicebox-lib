export interface ContentPlaceholder {
  /** The label's key in the communications dictionary */
  label: string;
  placeholder: string;
}

export interface PlaceholderKind {
  name: string;
  placeholders: ContentPlaceholder[];
}

/** The placeholders of each kind of data, in the old placeholder reference's order (PLACEHOLDERS) */
export const PLACEHOLDER_KINDS: PlaceholderKind[] = [
  {
    name: 'Applied state',
    placeholders: [
      {label: 'course_leader', placeholder: '{{course_leader}}'},
      {label: 'training_end_date', placeholder: '{{end_date}}'},
      {label: 'training_end_time', placeholder: '{{end_time}}'},
      {label: 'location_name', placeholder: '{{location}}'},
      {label: 'street_number', placeholder: '{{street}}'},
      {label: 'city', placeholder: '{{city}}'},
      {label: 'postcode', placeholder: '{{postcode}}'},
    ],
  },
  {
    name: 'Asset',
    placeholders: [
      {label: 'name', placeholder: '{{asset.name}}'},
      {label: 'amount', placeholder: '{{asset.amount}}'},
      {label: 'description', placeholder: '{{asset.description}}'},
    ],
  },
  {
    name: 'Customer',
    placeholders: [
      {label: 'firstname', placeholder: '{{entity.firstname}}'},
      {label: 'lastname', placeholder: '{{entity.lastname}}'},
      {label: 'email', placeholder: '{{entity.email}}'},
      {label: 'phone', placeholder: '{{entity.phone}}'},
    ],
  },
  {
    name: 'Seating',
    placeholders: [
      {label: 'name_in_english', placeholder: '{{matchday.name.en_GB}}'},
      {label: 'name_in_german', placeholder: '{{matchday.name.de_DE}}'},
    ],
  },
  {
    name: 'Lottery',
    placeholders: [
      {label: 'name', placeholder: '{{lottery.name}}'},
    ],
  },
  {
    name: 'Enquiry',
    placeholders: [
      {label: 'name', placeholder: '{{enquiry.name}}'},
      {label: 'wallet', placeholder: '{{enquiry.wallet}}'},
    ],
  },
  {
    name: 'Player',
    placeholders: [
      {label: 'salutation', placeholder: '{{player.attributes.salutation}}'},
      {label: 'firstname', placeholder: '{{player.attributes.firstname}}'},
      {label: 'lastname', placeholder: '{{player.attributes.lastname}}'},
      {label: 'email', placeholder: '{{player.attributes.email}}'},
    ],
  },
  {
    name: 'User',
    placeholders: [
      {label: 'firstname', placeholder: '{{firstname}}'},
      {label: 'lastname', placeholder: '{{lastname}}'},
      {label: 'email', placeholder: '{{email}}'},
    ],
  },
  {
    name: 'Commerce',
    placeholders: [
      {label: 'invoice_number', placeholder: '{{commerce.attributes.invoiceNumber}}'},
      {label: 'order_number', placeholder: '{{commerce.number}}'},
      {label: 'items_length', placeholder: '{{commerce.items.length}}'},
    ],
  },
  {
    name: 'Organisation',
    placeholders: [
      {label: 'email', placeholder: '{{organisation.email}}'},
      {label: 'phone', placeholder: '{{organisation.phone}}'},
      {label: 'street', placeholder: '{{organisation.address.street}}'},
      {label: 'postcode', placeholder: '{{organisation.address.postcode}}'},
      {label: 'city', placeholder: '{{organisation.address.city}}'},
      {label: 'country', placeholder: '{{organisation.address.country}}'},
    ],
  },
  {
    name: 'Canceled Training',
    placeholders: [
      {label: 'name', placeholder: '{{name}}'},
      {label: 'cancellation_reason', placeholder: '{{cancellation_reason}}'},
      {label: 'date_from', placeholder: '{{date_from}}'},
      {label: 'date_to', placeholder: '{{date_to}}'},
      {label: 'trainee_emails', placeholder: '{{trainee_emails}}'},
    ],
  },
  {
    name: 'Forgot Password',
    placeholders: [
      {label: 'user_id', placeholder: '{{userId}}'},
      {label: 'firstname', placeholder: '{{firstname}}'},
      {label: 'lastname', placeholder: '{{lastname}}'},
      {label: 'email', placeholder: '{{email}}'},
      {label: 'token', placeholder: '{{token}}'},
      {label: 'timestamp', placeholder: '{{timestamp}}'},
      {label: 'ip_address', placeholder: '{{ip}}'},
    ],
  },
  {
    name: 'Member status',
    placeholders: [
      {label: 'training_name', placeholder: '{{name}}'},
      {label: 'firstname', placeholder: '{{firstname}}'},
      {label: 'lastname', placeholder: '{{lastname}}'},
      {label: 'date', placeholder: '{{date}}'},
      {label: 'time', placeholder: '{{time}}'},
      {label: 'location', placeholder: '{{location}}'},
      {label: 'registrator_firstname', placeholder: '{{registrator_firstname}}'},
      {label: 'registrator_lastname', placeholder: '{{registrator_lastname}}'},
      {label: 'postcode', placeholder: '{{postcode}}'},
      {label: 'city', placeholder: '{{city}}'},
      {label: 'member_count', placeholder: '{{member_count}}'},
      {label: 'members', placeholder: '{{members}}'},
      {label: 'cost', placeholder: '{{cost}}'},
      {label: 'invoice_name', placeholder: '{{invoice_name}}'},
      {label: 'invoice_address', placeholder: '{{invoice_address}}'},
      {label: 'invoice_postcode', placeholder: '{{invoice_postcode}}'},
      {label: 'invoice_city', placeholder: '{{invoice_city}}'},
    ],
  },
  {
    name: 'AMG Customer',
    placeholders: [
      {label: 'salutation', placeholder: '{{customer.salutation}}'},
      {label: 'title', placeholder: '{{customer.title}}'},
      {label: 'firstname', placeholder: '{{customer.firstname}}'},
      {label: 'lastname', placeholder: '{{customer.lastname}}'},
      {label: 'email', placeholder: '{{customer.email}}'},
      {label: 'event_name', placeholder: '{{event.name}}'},
      {label: 'event_date', placeholder: '{{event.date}}'},
    ],
  },
];
