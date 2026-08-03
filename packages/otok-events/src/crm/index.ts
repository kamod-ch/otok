export { crmEvents, companyCreated, companyUpdated, activityLogged, notificationRequested } from "./events.js";
export type { CompanyCreated, CompanyUpdated, ActivityLogged, NotificationRequested } from "./events.js";
export { registerCrmEventHandlers } from "./handlers.js";
export type { CrmActivityStore, CrmSearchIndex, CrmNotificationLog, CrmHandlerDeps } from "./handlers.js";
