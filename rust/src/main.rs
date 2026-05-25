mod aec_core;
mod api;
mod utils;

use clap::{Parser, Subcommand};
use anyhow::Result;

#[derive(Debug, Parser)]
#[command(name = "policrm")]
#[command(about = "PoliCRM — AEC voter enrollment verification CRM", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Start the web CRM server
    Serve {
        /// Port to listen on
        #[arg(long, default_value_t = 8000)]
        port: u16,
    },
    /// Run AEC voter enrollment batch checker
    Check {
        /// Input CSV file path
        #[arg(long, default_value = "input.csv")]
        infile: String,
        /// Output CSV file path
        #[arg(long, default_value = "output.csv")]
        outfile: String,
        /// Number of rows to skip from start
        #[arg(long, default_value_t = 0)]
        skip: usize,
        /// Number of parallel browser threads
        #[arg(long, default_value_t = 1)]
        threads: usize,
        /// Run browsers in headless mode
        #[arg(long, default_value_t = false)]
        headless: bool,
        /// Validate input only, do not run checks
        #[arg(long, default_value_t = false)]
        dry_run: bool,
        /// NationBuilder base URL for member links
        #[arg(long, default_value = "https://app.nationbuilder.com")]
        nationbuilder_base: String,
    },
    /// Convert addresses in a CSV file to normalized format
    ConvertAddresses {
        /// Input CSV file path
        #[arg(long, default_value = "input.csv")]
        infile: String,
        /// Output CSV file path
        #[arg(long, default_value = "output_converted.csv")]
        outfile: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port: _ } => {
            api::app::run_server().await?;
        }
        Commands::Check {
            infile,
            outfile,
            skip,
            threads,
            headless,
            dry_run,
            nationbuilder_base,
        } => {
            let args = aec_core::checker::CheckerArgs {
                infile,
                outfile,
                skip,
                threads,
                headless,
                dry_run,
                nationbuilder_base,
            };
            aec_core::checker::run_checker(args).await?;
        }
        Commands::ConvertAddresses { infile, outfile } => {
            utils::address::convert_csv_addresses(&infile, &outfile)?;
        }
    }

    Ok(())
}
