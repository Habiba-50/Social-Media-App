import { z } from "zod";
import { createComment, deleteComment, reactComment, reactReply, replyOnComment } from "./comment.validation";

export type CreateCommentBodyDto = z.infer<typeof createComment.body>;
export type CreateCommentParamsDto = z.infer<typeof createComment.params>;

export type ReplyOnCommentParamsDto = z.infer<typeof replyOnComment.params>;
export type ReplyOnCommentBodyDto = z.infer<typeof replyOnComment.body>;

export type UpdateCommentBodyDto = z.infer<typeof replyOnComment.body>;
export type UpdateCommentParamsDto = z.infer<typeof replyOnComment.params>;

export type DeleteCommentParamsDto = z.infer<typeof deleteComment.params>;

export type ReactCommentQueryDto = z.infer<typeof reactComment.query>;
export type ReactCommentParamsDto = z.infer<typeof reactComment.params>;

export type ReactReplyParamsDto = z.infer<typeof reactReply.params>;
export type ReactReplyQueryDto = z.infer<typeof reactComment.query>;
