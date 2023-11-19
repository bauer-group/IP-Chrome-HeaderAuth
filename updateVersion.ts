import { readFileSync, writeFileSync } from 'fs';

interface PackageJson {
    version?: string;
}

const filesToUpdate: string[] = ['src/manifest.json'];

filesToUpdate.forEach((file) => {
    try {
        // Read the current file
        const content: string = readFileSync(file, 'utf8');
        const jsonContent: PackageJson = JSON.parse(content);

        // Increment the version
        if (jsonContent.version) {
            const versionParts: string[] = jsonContent.version.split('.');
            versionParts[versionParts.length - 1] = (parseInt(versionParts[versionParts.length - 1]) + 1).toString();
            jsonContent.version = versionParts.join('.');
        }

        // Write the updated content back to the file
        writeFileSync(file, JSON.stringify(jsonContent, null, 2));
        console.log(`Updated version in ${file} to ${jsonContent.version}`);
    } catch (error) {
        console.error(`Error processing ${file}: ${error}`);
    }
});
