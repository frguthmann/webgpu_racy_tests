import {TEST_BINDGROUP} from "./test_bindgroup.js";

export const DISPLAY_FS = /* wgsl */`

    @group(0) @binding(3) var<storage, read_write> testSyncAndErrorCount: array<u32>;

    @fragment
    fn main() -> @location(0) vec4f
    {
        return select(vec4(0.0, 1.0, 0.0, 1.0), vec4(1.0, 0.0, 0.0, 1.0), testSyncAndErrorCount[1] > 0);
    }
`;