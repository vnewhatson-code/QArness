const fs = require('fs');
const path = require('path');

// Определяем корневой путь: --path <dir> или текущая директория
const rootArgIndex = process.argv.indexOf('--path');
const rootPath = (rootArgIndex !== -1 && process.argv[rootArgIndex + 1])
    ? path.resolve(process.argv[rootArgIndex + 1])
    : process.cwd();

// Путь к формам 1С
const formsPath = path.join(rootPath, 'src/KonturSverka/Forms');
// Путь к документации
const docsPath = path.join(rootPath, 'docs/forms');

// Получаем список всех форм из xml файлов в директории Forms
const formNames = [];

// Считываем все файлы в директории Forms
const files = fs.readdirSync(formsPath);
files.forEach(file => {
    // Проверяем, что файл имеет расширение .xml
    if (file.endsWith('.xml')) {
        // Извлекаем имя формы из имени файла
        let formName = file.replace('.xml', '');
        
        // Исключаем служебные файлы
        if (formName.startsWith('_') && formName.endsWith('_')) {
            return;
        }
        
        // Исключаем служебные папки
        if (formName === '_______________Служебные_______________' ||
            formName === '___________Обычные_формы___________' ||
            formName === '_________Управляемые_формы_________' ||
            formName === '________________Модули________________') {
            return;
        }
        
        // Для форм, которые могут быть как обычными, так и управляемыми
        // добавляем их как отдельные записи
        if (formName && formName.trim() !== '') {
            formNames.push(formName);
        }
    }
});

// Также проверяем поддиректории, где могут быть управляемые формы
const dirs = fs.readdirSync(formsPath);
dirs.forEach(dir => {
    const dirPath = path.join(formsPath, dir);
    try {
        const stat = fs.statSync(dirPath);
        if (stat.isDirectory()) {
            // Проверяем, есть ли в этой папке Ext/Form.xml
            const extFormPath = path.join(dirPath, 'Ext', 'Form.xml');
            if (fs.existsSync(extFormPath)) {
                // Это управляемая форма
                const formName = dir;
                if (formName && formName.trim() !== '') {
                    formNames.push(formName);
                }
            }
        }
    } catch (error) {
        // Пропускаем недоступные директории
    }
});

// Удаляем дубликаты
const uniqueFormNames = [...new Set(formNames)];

console.log('Найденные формы:');
uniqueFormNames.forEach(name => {
    console.log(name);
});

// Получаем список уже существующих документов
const docFiles = [];
try {
    const docs = fs.readdirSync(docsPath);
    docs.forEach(doc => {
        if (doc.endsWith('.md')) {
            docFiles.push(doc.replace('.md', ''));
        }
    });
} catch (error) {
    // Если директория docs/forms не существует, создадим ее
    fs.mkdirSync(docsPath, { recursive: true });
}

console.log('\nДокументация найдена:');
console.log(docFiles);

// Находим формы без документации
const formsWithoutDocs = uniqueFormNames.filter(name => !docFiles.includes(name));

// Выводим результат
console.log('\nФормы 1С без документации:');
if (formsWithoutDocs.length > 0) {
    formsWithoutDocs.forEach(name => {
        console.log(`- ${name}`);
    });
} else {
    console.log('Все формы имеют документацию.');
}

// Сохраняем список в файл
const outputFile = path.join(docsPath, 'missing_docs.txt');
fs.writeFileSync(outputFile, formsWithoutDocs.join('\n'));

console.log(`\nСписок сохранен в ${outputFile}`);