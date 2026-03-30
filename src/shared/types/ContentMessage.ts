import { EventTypes } from "../constants/eventTypes"

export type ContentMessage = {
  type: EventTypes,
  data: any
}
