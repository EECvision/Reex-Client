declare class TypeGenerator {
  generateInterface(interfaceName: string, data: unknown): string;
  generateTypedInterfaces(data: unknown, baseName: string): string;
  buildCustomInterfaces(jsonContent: unknown, baseName: string): string;
}
declare const typeGenerator: TypeGenerator;
export default typeGenerator;
