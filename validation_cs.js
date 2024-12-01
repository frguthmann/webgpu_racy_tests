import {TEST_BINDGROUP} from "./test_bindgroup.js";

export const VALIDATION_CS = TEST_BINDGROUP + /* wgsl */`

    @compute @workgroup_size(8, 8, 1)
    fn main( @builtin(global_invocation_id) GlobalThreadID : vec3<u32>)
    {
        let texel = textureLoad(outputTexture, GlobalThreadID.xy).x;
        if(texel != frameIDClearValueSlowdownCount.x)
        {
            atomicAdd(&testSyncAndErrorCount[1], 1);
        }
    }
`;