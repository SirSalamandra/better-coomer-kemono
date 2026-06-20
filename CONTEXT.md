# Context

## Glossary

### Host Support Policy
The explicit policy that defines which Coomer and Kemono hosts the extension officially supports, how supported hosts are recognized at runtime, and how extension manifests and permissions must align with that support.

### Supported Host
A concrete hostname explicitly allowed by the Host Support Policy for extension runtime behavior and browser manifest permissions.

### Current Supported Hosts
The currently supported hosts are `coomer.st` and `kemono.cr`.

### Unsupported Host
A hostname not explicitly included in the Current Supported Hosts. The extension must treat an Unsupported Host as a safe no-op at runtime.

### Supported Browser Target
A browser/distribution target officially maintained by the build pipeline. The current supported browser targets are Chrome Manifest V3 and Firefox Manifest V2.
