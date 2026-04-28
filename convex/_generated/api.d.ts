/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devUtils from "../devUtils.js";
import type * as globals from "../globals.js";
import type * as http from "../http.js";
import type * as mathAi from "../mathAi.js";
import type * as migrations from "../migrations.js";
import type * as uploadthing from "../uploadthing.js";
import type * as user_lists from "../user_lists.js";
import type * as user_lists_get from "../user_lists_get.js";
import type * as user_vars from "../user_vars.js";
import type * as user_vars_get from "../user_vars_get.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  devUtils: typeof devUtils;
  globals: typeof globals;
  http: typeof http;
  mathAi: typeof mathAi;
  migrations: typeof migrations;
  uploadthing: typeof uploadthing;
  user_lists: typeof user_lists;
  user_lists_get: typeof user_lists_get;
  user_vars: typeof user_vars;
  user_vars_get: typeof user_vars_get;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
