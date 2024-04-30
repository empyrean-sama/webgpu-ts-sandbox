struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
}

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) color: vec3f) -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4f(position,0.0,1.0);
    out.color = vec4f(color,1.0);
    return out;
}

@fragment
fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4f {
    return fragData.color;
}