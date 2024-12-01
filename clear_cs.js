import {TEST_BINDGROUP} from "./test_bindgroup.js";

export const CLEAR_CS = TEST_BINDGROUP + /* wgsl */`

    @compute @workgroup_size(8, 8, 1)
    fn main( @builtin(global_invocation_id) GlobalThreadID : vec3<u32>)
    {
        textureStore(outputTexture, GlobalThreadID.xy, vec4<u32>(frameIDClearValueSlowdownCount.y, 0, 0, 0));
    }
`;