import { SyntaxKind, VariableDeclaration, ObjectLiteralExpression } from "ts-morph";

/**
 * Safely extracts the ObjectLiteralExpression from a VariableDeclaration's initializer.
 * Handles unwrapping of AsExpression, SatisfiesExpression, TypeAssertion, and ParenthesizedExpression.
 */
export const getInitializerObject = (variableDecl: VariableDeclaration): ObjectLiteralExpression | undefined => {
    let initializer: any = variableDecl.getInitializer();

    if (!initializer) return undefined;

    // Unwrap expressions to get to the core ObjectLiteralExpression
    while (
        initializer && (
            initializer.getKind() === SyntaxKind.AsExpression ||
            initializer.getKind() === SyntaxKind.SatisfiesExpression ||
            initializer.getKind() === SyntaxKind.TypeAssertionExpression ||
            initializer.getKind() === SyntaxKind.NonNullExpression ||
            initializer.getKind() === SyntaxKind.ParenthesizedExpression
        )
    ) {
        initializer = initializer.getExpression();
    }

    if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        return initializer as ObjectLiteralExpression;
    }

    return undefined;
};
