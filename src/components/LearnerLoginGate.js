import React from "react";
import { Button, Card, CardContent, Grid, TextField } from "@material-ui/core";

class LearnerLoginGate extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            learnerID: "",
            error: "",
        };
    }

    onSubmit = (event) => {
        event.preventDefault();
        const learnerID = String(this.state.learnerID || "").trim();
        if (learnerID.length < 3) {
            this.setState({
                error: "Please enter a learner ID with at least 3 characters.",
            });
            return;
        }

        this.setState({ error: "" });
        this.props.onLogin(learnerID);
    };

    render() {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                        "radial-gradient(circle at 20% 15%, rgba(127,220,200,0.32), transparent 34%), radial-gradient(circle at 85% 12%, rgba(30,159,134,0.14), transparent 32%), linear-gradient(135deg, #effffb 0%, #f8fffd 100%)",
                    padding: 20,
                }}
            >
                <Card
                    style={{
                        width: "100%",
                        maxWidth: 760,
                        borderRadius: 24,
                        overflow: "hidden",
                        animation: "qqRiseIn 420ms ease",
                    }}
                >
                    <CardContent>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                                gap: 20,
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        marginBottom: 8,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: "#167c67",
                                        background: "rgba(30,159,134,0.14)",
                                        borderRadius: 999,
                                        padding: "4px 10px",
                                    }}
                                >
                                    Personalized Learning Studio
                                </div>
                                <h2
                                    style={{
                                        marginTop: 0,
                                        marginBottom: 8,
                                        fontFamily: "Space Grotesk, Outfit, sans-serif",
                                        fontSize: "2rem",
                                        lineHeight: 1.15,
                                    }}
                                >
                                    Quad-Quests
                                </h2>
                                <p
                                    style={{
                                        marginTop: 0,
                                        marginBottom: 0,
                                        color: "#2d4f4a",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    Theory-first, adaptive questions, and interactive visual labs.
                                    Enter your learner ID and we will open your chapter directly.
                                </p>
                            </div>
                            <div
                                style={{
                                    padding: 14,
                                    borderRadius: 16,
                                    border: "1px solid rgba(22,124,103,0.2)",
                                    background: "rgba(255,255,255,0.74)",
                                }}
                            >
                        <form onSubmit={this.onSubmit}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Enter Learner ID"
                                        fullWidth
                                        variant="outlined"
                                        value={this.state.learnerID}
                                        onChange={(event) =>
                                            this.setState({ learnerID: event.target.value })
                                        }
                                        inputProps={{
                                            "aria-label": "Learner ID",
                                            autoComplete: "off",
                                        }}
                                    />
                                </Grid>
                                {this.state.error ? (
                                    <Grid item xs={12}>
                                        <div style={{ color: "#b91c1c", fontSize: 14 }}>
                                            {this.state.error}
                                        </div>
                                    </Grid>
                                ) : null}
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                    >
                                        Start Quad-Quests
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
}

export default LearnerLoginGate;
