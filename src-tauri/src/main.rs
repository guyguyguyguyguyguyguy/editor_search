#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use scraper::{Html, Selector};
use thiserror;

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] reqwest::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
async fn process_search(query: String) -> Result<(), Error> {

    let url = format!("https://scholar.google.com/scholar?q={}", query);
    let html = reqwest::get(&url)
        .await?
        .text()
        .await?;

    let fragment = Html::parse_document(&html);
    let elem_selector = Selector::parse("div.gs_r.gs_or.gs_scl").unwrap();
    let link_selector = Selector::parse(".gs_or_ggsm > a").unwrap();
    let title_selector = Selector::parse("h3").unwrap();
    let snippet_selector = Selector::parse(".gs_rs").unwrap();


    println!("\n {} \n", query.to_uppercase());

    for element in fragment.select(&elem_selector).take(5) {
        let title_element = element.select(&title_selector).next().unwrap();
        let title = title_element
            .text()
            .collect::<Vec<_>>()
            .join("");

        let link = match element.select(&link_selector).next() {
            Some(le) => le.value().attr("href").unwrap(),
            None     => "No pdf link",
        };

        let snippet_element = element.select(&snippet_selector).next().unwrap();
        let snippet = snippet_element
            .text()
            .collect::<Vec<_>>()
            .join("");

        println!("Title: {}", title);
        println!("Link: {}", link);
        println!("Snippet: {}", snippet);
    }

    // TODO return json of the first 3 values
    /*
        fragment.select(&selector).iter()
            .map(|e| {
                title
            })
            .take(3);
    */

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![process_search])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
