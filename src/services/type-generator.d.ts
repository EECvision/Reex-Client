declare class TypeGenerator {
  generateInterface(interfaceName: string, data: any): string;
  generateTypedInterfaces(data: any, baseName: string): string;
  buildCustomInterfaces(jsonContent: any, baseName: string): string;
}
declare const typeGenerator: TypeGenerator;
export default typeGenerator;
