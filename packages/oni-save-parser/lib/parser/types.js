"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMetaInstruction = isMetaInstruction;
const util_1 = require("util");
function isMetaInstruction(inst) {
    return (0, util_1.isObject)(inst) && !!inst.isMeta;
}
//# sourceMappingURL=types.js.map