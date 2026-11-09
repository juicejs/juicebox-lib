import {Juice} from '../../../../shared/services/juice.service';
import {MediaFile, MediaText} from '../../../../shared/components/media/media.types';
import {Result} from '../../../../shared/types/Result';

/** A room plan of the `room-plan` service, as far as a venue's seating layout shows it */
export interface RoomPlan {
  _id: string;
  name?: MediaText;
  media?: MediaFile[];
}

export function getRoomPlan(juice: Juice, id: string): Promise<Result<RoomPlan>> {
  return juice.request('room-plan', 'getRoomPlan', [id, {}]);
}

/** The first ten room plans whose name matches, as the old dialog searched them */
export function searchRoomPlans(juice: Juice, term: string, language: string): Promise<Result<{roomPlans: RoomPlan[]}>> {
  return juice.request('room-plan', 'fetch', [0, 10, {search: [{property: 'name', fullText: true, language, term}]}]);
}
