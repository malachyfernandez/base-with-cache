import { userVarConfig } from "./userVarConfig";

export type DevWarningKey =
    | "uservar_op_timeout"
    | "uservar_rollback"
    | "uservar_auth_not_ready"
    | "userlist_length_shared_item";

export function devWarn(key: DevWarningKey, message: string) {
    if (!userVarConfig.devWarningsEnabled) return;

    const configPath = "utils/userVarConfig.ts";

    if (key === "uservar_op_timeout" && !userVarConfig.warnOnUserVarOpTimeout) {
        return;
    }

    if (key === "uservar_rollback" && !userVarConfig.logOnUserVarRollback) {
        return;
    }

    if (
        key === "userlist_length_shared_item" &&
        !userVarConfig.warnOnUserListLengthSharedItem
    ) {
        return;
    }

    console.warn(
        `[BeanJar Dev Warning:${key}] ${message} (disable/edit: ${configPath})`
    );
}
