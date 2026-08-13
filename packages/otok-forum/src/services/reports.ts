import { FORUM_PERMISSIONS, requireForumPermission } from "../permissions.js";
import type {
  CreateReportInput,
  ForumPermission,
  ForumReport,
  ForumReportStatus,
  ForumStorageAdapter,
  ReportListOptions,
} from "../types.js";
import { nowUtc } from "../utils.js";
import { ForumNotFoundError } from "./threads.js";

export class ReportService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  async create(input: CreateReportInput, permissions: ForumPermission[]): Promise<ForumReport> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.REPORT_CREATE);
    return this.storage.reports.create(input);
  }

  async review(
    reportId: string,
    status: ForumReportStatus,
    reviewerId: string,
    permissions: ForumPermission[],
  ): Promise<ForumReport> {
    requireForumPermission(permissions, FORUM_PERMISSIONS.REPORT_REVIEW);
    const report = await this.storage.reports.findById(reportId);
    if (!report) throw new ForumNotFoundError("report");
    return this.storage.reports.update(reportId, {
      status,
      reviewedById: reviewerId,
      reviewedAt: nowUtc(),
    });
  }

  list(options: ReportListOptions = {}) {
    return this.storage.reports.list(options);
  }

  findById(id: string) {
    return this.storage.reports.findById(id);
  }
}

export class ModerationService {
  constructor(private readonly storage: ForumStorageAdapter) {}

  async logEvent(input: {
    actorId: string;
    action: string;
    targetType: "thread" | "post" | "report";
    targetId: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.storage.moderation.append({ ...input, createdAt: nowUtc() });
  }

  async hidePost(postId: string, actorId: string, permissions: ForumPermission[], reason?: string) {
    requireForumPermission(permissions, FORUM_PERMISSIONS.POST_DELETE_ANY);
    await this.storage.posts.update(postId, { isHidden: true });
    return this.logEvent({
      actorId,
      action: "post.hide",
      targetType: "post",
      targetId: postId,
      reason,
    });
  }

  list(options = {}) {
    return this.storage.moderation.list(options);
  }
}
