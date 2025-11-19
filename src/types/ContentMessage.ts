import { EventTypes } from "../enums/eventTypes"

export type ContentMessage = { 
  type: EventTypes,
  data: any
}