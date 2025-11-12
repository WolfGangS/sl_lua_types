export function hasEffect(name: string): boolean {
    const knownSideEffects = [
        "llForceMouselook",
        "llGetNextEmail",
        "llGroundRepel",
        "llDeleteCharacter",
        "llHttpResponse",
        "llMinEventDelay",
        "llModifLand",
        "llNavigateTo",
        "llOffsetTexture",
        "llParcelMediaCommandList",
        "llPursue",
        "llPushObject",
        "llWhisper",
        "llShout",
        "llScaleByFactor",
        "llScaleTexture",
        "llScriptProfiler",
        "llSitOnLink",
        "llSleep",
        "llStartAnimation",
        "llStartObjectAnimation",
        "llDialog",
        "llTextBox",
        "llUnSit",
        "llVolumeDetect",
        "llWanderWithin",
    ];

    const knonwEffectless: string[] = [
        "llAvatarOnLinkSitTarget",
        "llAvatarOnSitTarget",
        "llGetExperienceErrorMessage",
        "llGetEnvironment",
    ];

    const sideEfectKeyWords = [
        "Set",
        "Say",
        "Request",
        "Write",
        "Reset",
        "Particle",
        "Add",
        "Adjust",
        "Apply",
        "AttachTo",
        "Clear",
        "Sound",
        "Notecard",
        "Give",
        "KeyValue",
        "LinksetDataDelete",
        "LinksetDataWrite",
        "Target",
        "Listen",
        "Load",
        "Manage",
        "Map",
        "Message",
        "Pass",
        "Release",
        "Remove",
        "Return",
        "Environment",
        "RezObject",
        "RezAt",
        "Rotate",
        "LookAt",
        "Sensor",
        "Stop",
        "Controls",
        "Teleport",
        "Transfer",
        "Trigger",
        "Update",
    ];

    if (knonwEffectless.includes(name)) return false;
    for (const key of sideEfectKeyWords) {
        if (name.indexOf(key) > 0) return true;
    }
    if (knownSideEffects.includes(name)) return true;

    return false;
}

export function castValueType(
    value: string,
    type: string,
): string | number | null {
    // const type = map.get("type")?.text ?? "void";
    // const value = map.get("value")?.text ?? "";
    // const isNum = type === "integer" || type === "float";
    // const numValue = type == "float" ? parseFloat(value) : parseInt(value);
    switch (type) {
        case "integer":
            return parseInt(value);
        case "float":
            return parseFloat(value);
        case "string":
        case "vector":
        case "rotation":
            return value;
        default:
            console.error("Unhandled type for lsl cast", value, type);
            throw "Unhandled type for lsl cast";
    }
}

export function cleanTooltip(tip: string): string {
    tip = tip.trim();
    tip = tip.replaceAll("\\n", "\n");
    tip = tip.replaceAll("\n\n               ", "\n");
    return tip;
}
