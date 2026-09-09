import { VariableDeclaration, ObjectLiteralExpression, Node } from "ts-morph";

/**
 * Safely extracts the ObjectLiteralExpression from a VariableDeclaration's initializer.
 * Handles unwrapping of AsExpression, SatisfiesExpression, TypeAssertion, and ParenthesizedExpression.
 */
export const getInitializerObject = (variableDecl: VariableDeclaration): ObjectLiteralExpression | undefined => {
    let initializer: Node | undefined = variableDecl.getInitializer();

    if (!initializer) return undefined;

    // Unwrap expressions to get to the core ObjectLiteralExpression
    while (
        initializer && (
            Node.isAsExpression(initializer) ||
            Node.isSatisfiesExpression(initializer) ||
            Node.isTypeAssertion(initializer) ||
            Node.isNonNullExpression(initializer) ||
            Node.isParenthesizedExpression(initializer)
        )
    ) {
        initializer = initializer.getExpression();
    }

    if (initializer && Node.isObjectLiteralExpression(initializer)) {
        return initializer;
    }

    return undefined;
};

