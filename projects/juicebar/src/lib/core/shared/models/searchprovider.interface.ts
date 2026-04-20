export interface IJuiceboxExtensions {
    search(token: string): Promise<Array<{
        title: string,
        details: string,
        link: string
    }>>
}