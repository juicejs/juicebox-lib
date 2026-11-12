import {ConfigurationService} from '../../../shared/services/configuration.service';

/** Opening a content (CONTENTOPEN) */
export const CONTENT_UPDATE_PERMISSION = 'communication:role#updated';

/** Contents have a tag where the backend configuration has the `amgshop` entry (CONTENTTAGS) */
export async function hasContentTags(configuration: ConfigurationService): Promise<boolean> {
  const amgshop = await configuration.getByKey('amgshop');
  return !!amgshop?.success;
}

/** A content's page */
export function contentLink(contentId: string): string[] {
  return ['/main/communications/contents/details', contentId];
}
